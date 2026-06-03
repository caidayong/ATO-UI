# -*- coding: utf-8 -*-
"""
将 docs/requirements 下一级业务域目录重命名为「两位数字 + 原中文名」（无连字符），
例如：登录 -> 01登录，以便资源管理器按名称排序后与产品约定顺序一致。

约定顺序（上 -> 下）：
登录、工作台、自动化开发、版本用例开发、自动化应用、测试工具、产测软件管理、报表、系统设置

运行环境：Python 3.9+ 即可（本仓库常见为 3.10.x，可用 `py -3.10` 或 `python`）。
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# 与脚本同目录：终端无输出时打开此文件查看（Windows 上 python3.11 可能是 shim，控制台不显示）
_LOG_PATH = Path(__file__).resolve().parent / "reorder_requirements_last_run.log"


def _resolve_root() -> Path:
    env = os.environ.get("AUTOTESTONE_ROOT", "").strip()
    if env:
        p = Path(env)
        if (p / "docs" / "requirements").is_dir():
            return p
    _cand = Path(__file__).resolve().parents[1]
    if (_cand / "docs" / "requirements").is_dir():
        return _cand
    cwd = Path.cwd()
    if (cwd / "docs" / "requirements").is_dir():
        return cwd
    return _cand


ROOT = _resolve_root()
REQ = ROOT / "docs" / "requirements"

# 旧名（纯业务域） -> 新名（数字前缀 + 业务域，无「-」）
RENAMES: list[tuple[str, str]] = [
    ("登录", "01登录"),
    ("工作台", "02工作台"),
    ("自动化开发", "03自动化开发"),
    ("版本用例开发", "04版本用例开发"),
    ("自动化应用", "05自动化应用"),
    ("测试工具", "06测试工具"),
    ("产测软件管理", "07产测软件管理"),
    ("报表", "08报表"),
    ("系统设置", "09系统设置"),
]

# 若曾用过「01-登录」或临时名，可先归一为纯中文再跑本脚本；此处仅处理上表左列 -> 右列
LEGACY_FROM: dict[str, str] = {
    "01-登录": "登录",
    "02-工作台": "工作台",
    "03-自动化开发": "自动化开发",
    "04-版本用例开发": "版本用例开发",
    "05-自动化应用": "自动化应用",
    "06-测试工具": "测试工具",
    "07-产测软件管理": "产测软件管理",
    "08-报表": "报表",
    "09-系统设置": "系统设置",
}


def _p(msg: str) -> None:
    print(msg, flush=True)
    try:
        with _LOG_PATH.open("a", encoding="utf-8") as f:
            f.write(msg + "\n")
    except OSError:
        pass


def _normalize_legacy_dirs() -> None:
    """把旧方案「01-xxx」目录改回纯中文名，便于再走 RENAMES。"""
    if not REQ.is_dir():
        return
    for legacy, plain in LEGACY_FROM.items():
        p_leg = REQ / legacy
        p_plain = REQ / plain
        if p_leg.is_dir() and not p_plain.exists():
            p_leg.rename(p_plain)
            _p(f"LEGACY: {legacy!r} -> {plain!r}")


def main() -> int:
    try:
        _LOG_PATH.write_text("", encoding="utf-8")
    except OSError:
        pass
    _p("[reorder] log file: " + str(_LOG_PATH))
    _p("=== reorder_requirements_top_dirs ===")
    _p(f"ROOT = {ROOT}")
    _p(f"REQ  = {REQ}")
    _p(f"REQ exists = {REQ.is_dir()}")
    if not REQ.is_dir():
        _p("ERR: docs/requirements 不存在。请确认在正确的仓库根下，且该目录已创建。")
        print("ERR: not a directory:", REQ, file=sys.stderr, flush=True)
        return 1

    tops = sorted(x.name for x in REQ.iterdir() if x.is_dir())
    _p(f"当前一级子目录 ({len(tops)}): {tops!r}")

    _normalize_legacy_dirs()

    tmp: list[tuple[Path, Path]] = []
    for old, new in RENAMES:
        src = REQ / old
        if not src.is_dir():
            _p(f"SKIP (missing): {old!r} -> 目标 {new!r}")
            continue
        if src.name == new:
            _p(f"SKIP (already): {new!r}")
            continue
        mid = REQ / (".__tmp__" + new)
        if mid.exists():
            _p(f"ERR: 临时目录已存在: {mid}")
            print("ERR: temp exists:", mid, file=sys.stderr, flush=True)
            return 1
        final = REQ / new
        if final.exists():
            _p(f"ERR: 目标目录已存在: {final}")
            print("ERR: final exists:", final, file=sys.stderr, flush=True)
            return 1
        src.rename(mid)
        tmp.append((mid, final))
        _p(f"STAGE1: {old!r} -> {mid.name!r}")

    for mid, final in tmp:
        mid.rename(final)
        _p(f"STAGE2: {mid.name!r} -> {final.name!r}")

    if tmp:
        _p(f"OK: 已重命名 {len(tmp)} 个一级目录。")
    else:
        _p("完成: 0 个目录被重命名。")
        _p("若上面全是 SKIP(missing)：一级目录可能已是「01登录」等形式，无需再跑；或仓库结构与本脚本预期不一致。")
        _p("若全是 SKIP(already)：已是最终名称。")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SystemExit:
        raise
    except BaseException:
        import traceback

        tb = traceback.format_exc()
        try:
            _LOG_PATH.write_text(tb, encoding="utf-8")
        except OSError:
            pass
        print(tb, file=sys.stderr, flush=True)
        raise SystemExit(1) from None
