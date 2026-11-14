#!/usr/bin/env python3
"""Generate data/pets.json from a local rocom-wiki-data checkout."""

from __future__ import annotations

import argparse
import hashlib
import importlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
CATALOG_RELATIVE_PATH = Path("data/wiki_modules/Pets/data/Catalog.lua")
S5_SEASON_RELATIVE_PATH = Path("data/seasons/S5Season.lua")
LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/"
REPOSITORY_URL = "https://github.com/JayeGT002/rocom-wiki-data"
UNWEIGHTED_CATALOG_IDS = {"pet_000622"}

# Keep the existing app-visible difficulty bands stable. The upstream catalog
# supplies egg weights, while this app-specific 1–10 classification is derived
# from total_range. Boundaries are midpoints between the bands in the original
# 578-record dataset, so a source refresh doesn't silently relabel existing pets.
TIER_UPPER_BOUNDS = (217, 432, 748, 985, 1408, 2147, 3035, 4692, 7533)
TIER_LABELS = {
    1: "极极简单",
    2: "极简单",
    3: "简单",
    4: "较简单",
    5: "中等偏易",
    6: "中等",
    7: "困难",
    8: "很困难",
    9: "极困难",
    10: "地狱级",
}


def source_revision(source_root: Path) -> str:
    try:
        return subprocess.check_output(
            ["git", "-C", str(source_root), "rev-parse", "HEAD"],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def load_upstream_modules(source_root: Path) -> tuple[Any, dict[int, str]]:
    tools_dir = source_root / "tools"
    if not (tools_dir / "pet_data.py").is_file() or not (tools_dir / "query_pet.py").is_file():
        raise ValueError(
            f"{source_root} 不是完整的 rocom-wiki-data checkout：缺少 tools/pet_data.py 或 tools/query_pet.py"
        )
    sys.path.insert(0, str(tools_dir))
    try:
        pet_data = importlib.import_module("pet_data")
        query_pet = importlib.import_module("query_pet")
    finally:
        sys.path.pop(0)
    return pet_data.LuaTableParser, query_pet.EGG_GROUPS


def require_integer(value: Any, field: str, pet_id: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"{pet_id}.{field} 必须是整数，实际为 {value!r}")
    return value


def app_tier(total_range: int) -> int:
    for tier, upper_bound in enumerate(TIER_UPPER_BOUNDS, start=1):
        if total_range <= upper_bound:
            return tier
    return 10


def make_egg_weight(egg_size: dict[str, Any], pet_id: str) -> dict[str, Any]:
    minimum = require_integer(egg_size.get("min"), "egg_size.min", pet_id)
    mini_max = require_integer(egg_size.get("mini_max"), "egg_size.mini_max", pet_id)
    huge_min = require_integer(egg_size.get("huge_min"), "egg_size.huge_min", pet_id)
    maximum = require_integer(egg_size.get("max"), "egg_size.max", pet_id)
    if not minimum <= mini_max <= huge_min <= maximum:
        raise ValueError(f"{pet_id}.egg_size 区间顺序无效：{egg_size!r}")

    mini_interval = mini_max - minimum
    huge_interval = maximum - huge_min
    total_range = maximum - minimum
    mini_tiers = max(1, (mini_interval + 9) // 10)
    huge_tiers = max(1, (huge_interval + 9) // 10)
    tier = app_tier(total_range)
    return {
        "min": minimum,
        "mini_max": mini_max,
        "huge_min": huge_min,
        "max": maximum,
        "mini_interval": mini_interval,
        "huge_interval": huge_interval,
        "mini_tiers": mini_tiers,
        "huge_tiers": huge_tiers,
        "total_range": total_range,
        "tier": tier,
        "tier_label": TIER_LABELS[tier],
        "interval_count_1g": mini_interval + 1,
    }


def generate(source_root: Path) -> tuple[dict[str, Any], int]:
    catalog_path = source_root / CATALOG_RELATIVE_PATH
    s5_path = source_root / S5_SEASON_RELATIVE_PATH
    if not catalog_path.is_file():
        raise ValueError(f"找不到上游图鉴文件：{catalog_path}")
    if not s5_path.is_file():
        raise ValueError(f"找不到上游 S5 赛季文件：{s5_path}")

    lua_parser, egg_group_names = load_upstream_modules(source_root)
    egg_group_names = dict(egg_group_names)
    egg_group_names[1] = "无法孵蛋"
    try:
        catalog = lua_parser(catalog_path.read_text(encoding="utf-8")).parse()
    except (OSError, ValueError) as exc:
        raise ValueError(f"解析上游 Catalog.lua 失败：{exc}") from exc
    try:
        s5_season = lua_parser(s5_path.read_text(encoding="utf-8")).parse()
    except (OSError, ValueError) as exc:
        raise ValueError(f"解析上游 S5Season.lua 失败：{exc}") from exc

    pets = []
    skipped_without_egg_size = 0
    seen_ids: set[str] = set()
    used_group_ids: set[int] = set()
    chains: dict[str, list[str]] = {}
    stage_by_id: dict[str, int] = {}

    for pet_id, source_pet in catalog.items():
        if not (isinstance(pet_id, str) and pet_id.startswith("pet_") and isinstance(source_pet, dict)):
            continue

        egg_size = source_pet.get("egg_size")
        if egg_size is None:
            if pet_id not in UNWEIGHTED_CATALOG_IDS:
                skipped_without_egg_size += 1
                continue
        elif not isinstance(egg_size, dict):
            raise ValueError(f"{pet_id}.egg_size 必须是 table")
        if egg_size is not None and not {"min", "mini_max", "huge_min", "max"}.issubset(egg_size):
            raise ValueError(f"{pet_id}.egg_size 缺少边界字段：{egg_size!r}")

        number = source_pet.get("number")
        if number is None:
            raise ValueError(f"{pet_id}.number 缺失")
        group_ids = source_pet.get("egg_group") or []
        if not isinstance(group_ids, list):
            raise ValueError(f"{pet_id}.egg_group 必须是列表")
        group_ids = [require_integer(group_id, "egg_group[]", pet_id) for group_id in group_ids]
        unknown_groups = [group_id for group_id in group_ids if group_id not in egg_group_names]
        if unknown_groups:
            raise ValueError(f"{pet_id} 包含上游未定义的蛋组 ID：{unknown_groups}")

        raw_types = source_pet.get("types") or []
        if not isinstance(raw_types, list) or any(not isinstance(item, str) for item in raw_types):
            raise ValueError(f"{pet_id}.types 必须是字符串列表")
        attributes = [item[:-1] if item.endswith("系") else item for item in raw_types]
        evolution_id = source_pet.get("evolution_id")
        if not isinstance(evolution_id, str) or not evolution_id:
            raise ValueError(f"{pet_id}.evolution_id 缺失")
        stage = require_integer(source_pet.get("stage"), "stage", pet_id)
        if pet_id in seen_ids:
            raise ValueError(f"上游数据包含重复宠物 ID：{pet_id}")
        seen_ids.add(pet_id)
        used_group_ids.update(group_ids)

        pet = {
            "id": pet_id,
            "name": source_pet.get("title") or source_pet.get("name") or pet_id,
            "number": str(number).zfill(3),
            "evolution_id": evolution_id,
            "stage": stage,
            "egg_groups": [egg_group_names[group_id] for group_id in group_ids],
            "egg_group_ids": group_ids,
            "egg_weight": make_egg_weight(egg_size, pet_id) if egg_size is not None else None,
            "attributes": attributes,
        }
        pets.append(pet)
        stage_by_id[pet_id] = stage
        chains.setdefault(evolution_id, []).append(pet_id)

    s5_initial_count = 0
    for pet_id, source_pet in s5_season.items():
        if not (isinstance(pet_id, str) and pet_id.startswith("pet_") and isinstance(source_pet, dict)):
            continue
        stage = require_integer(source_pet.get("stage"), "stage", pet_id)
        if stage != 1:
            continue
        if pet_id in seen_ids:
            raise ValueError(f"Catalog.lua 与 S5Season.lua 包含重复宠物 ID：{pet_id}")

        number = source_pet.get("number")
        if number is None:
            raise ValueError(f"{pet_id}.number 缺失")
        group_ids = source_pet.get("egg_group") or []
        if not isinstance(group_ids, list):
            raise ValueError(f"{pet_id}.egg_group 必须是列表")
        group_ids = [require_integer(group_id, "egg_group[]", pet_id) for group_id in group_ids]
        unknown_groups = [group_id for group_id in group_ids if group_id not in egg_group_names]
        if unknown_groups:
            raise ValueError(f"{pet_id} 包含上游未定义的蛋组 ID：{unknown_groups}")

        raw_types = source_pet.get("types") or []
        if not isinstance(raw_types, list) or any(not isinstance(item, str) for item in raw_types):
            raise ValueError(f"{pet_id}.types 必须是字符串列表")
        attributes = [item[:-1] if item.endswith("系") else item for item in raw_types]
        egg_size = source_pet.get("egg_size")
        if egg_size is not None and not isinstance(egg_size, dict):
            raise ValueError(f"{pet_id}.egg_size 必须是 table")
        if egg_size is not None and not {"min", "mini_max", "huge_min", "max"}.issubset(egg_size):
            raise ValueError(f"{pet_id}.egg_size 缺少边界字段：{egg_size!r}")

        evolution_id = f"evolution_s5_{pet_id}"
        pet = {
            "id": pet_id,
            "name": source_pet.get("title") or source_pet.get("name") or pet_id,
            "number": str(number).zfill(3),
            "evolution_id": evolution_id,
            "stage": stage,
            "egg_groups": [egg_group_names[group_id] for group_id in group_ids],
            "egg_group_ids": group_ids,
            "egg_weight": make_egg_weight(egg_size, pet_id) if egg_size is not None else None,
            "attributes": attributes,
        }
        pets.append(pet)
        seen_ids.add(pet_id)
        used_group_ids.update(group_ids)
        stage_by_id[pet_id] = stage
        chains.setdefault(evolution_id, []).append(pet_id)
        s5_initial_count += 1

    if s5_initial_count == 0:
        raise ValueError("S5Season.lua 没有初始形态记录")

    if not pets:
        raise ValueError("上游 Catalog.lua 没有可导入的完整蛋重数据")
    for pet_ids in chains.values():
        pet_ids.sort(key=stage_by_id.__getitem__)

    data = {
        "pets": pets,
        "evolution_chains": chains,
        "metadata": {
            "total_pets": len(pets),
            "total_chains": len(chains),
            "tier_definition": "界面难度档位 1–10 按 total_range 分桶；阈值取原有相邻档位范围的中点。",
            "egg_groups": [egg_group_names[group_id] for group_id in sorted(used_group_ids)],
            "mapping_method": "Catalog.lua 与 S5Season.lua 提供精灵数据；蛋重间隔、区间计数与界面难度档位由转换脚本派生。",
            "note": "重量单位为克(g),显示时除以1000转换为kg,保留3位小数",
            "source": {
                "repository": REPOSITORY_URL,
                "commit": source_revision(source_root),
                "catalog": CATALOG_RELATIVE_PATH.as_posix(),
                "catalog_sha256": hashlib.sha256(catalog_path.read_bytes()).hexdigest(),
                "s5_season": S5_SEASON_RELATIVE_PATH.as_posix(),
                "s5_season_sha256": hashlib.sha256(s5_path.read_bytes()).hexdigest(),
                "license": "CC BY-SA 4.0",
                "license_url": LICENSE_URL,
            },
            "attribute_normalization": "从上游 types 字段复制，移除末尾的“系”。",
        },
    }
    return data, skipped_without_egg_size


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True, help="rocom-wiki-data 仓库的本地 checkout 路径")
    parser.add_argument("--output", type=Path, default=PROJECT_ROOT / "data/pets.json", help="输出文件，默认 data/pets.json")
    parser.add_argument("--dry-run", action="store_true", help="只解析并显示记录数，不写入文件")
    args = parser.parse_args()

    try:
        data, skipped = generate(args.source.expanduser().resolve())
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"数据转换失败：{exc}", file=sys.stderr)
        return 1

    output_path = args.output.expanduser().resolve()
    if not args.dry_run:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        payload = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
        temporary_path = None
        try:
            with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=output_path.parent, delete=False) as handle:
                handle.write(payload)
                temporary_path = Path(handle.name)
            os.replace(temporary_path, output_path)
        finally:
            if temporary_path and temporary_path.exists():
                temporary_path.unlink()

    action = "预览" if args.dry_run else "已写入"
    print(f"{action} {len(data['pets'])} 条精灵记录、{len(data['evolution_chains'])} 条进化链；跳过 {skipped} 条暂无完整蛋重的数据。")
    if not args.dry_run:
        print(output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
