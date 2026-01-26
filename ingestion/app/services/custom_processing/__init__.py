from __future__ import annotations

import importlib
import sys
import pkgutil
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, Optional

from app.utils.logger import logger

DeviceProcessor = Callable[[Dict[str, Any]], Dict[str, Any]]

# Map device UID (lowercased) -> processor function.
_DEVICE_PROCESSORS: Dict[str, DeviceProcessor] = {}

def _normalize_uid(device_uid: str) -> str:
    return str(device_uid or "").strip().lower()

def register_device_processor(device_uid: str, processor: DeviceProcessor, registry: Optional[Dict[str, DeviceProcessor]] = None) -> None:
    """Register a processor for a device UID."""
    normalized = _normalize_uid(device_uid)
    if not normalized or not callable(processor):
        return
    target = registry if registry is not None else _DEVICE_PROCESSORS
    target[normalized] = processor

def _extract_device_uids(module) -> Iterable[str]:
    if hasattr(module, "DEVICE_UIDS"):
        uids = getattr(module, "DEVICE_UIDS")
        if isinstance(uids, (list, tuple, set)):
            return uids
        return [uids]
    if hasattr(module, "DEVICE_UID"):
        return [getattr(module, "DEVICE_UID")]
    if hasattr(module, "device_uid"):
        return [getattr(module, "device_uid")]
    return []

def _register_from_module(module, registry: Dict[str, DeviceProcessor]) -> None:
    processor = getattr(module, "process", None)
    if not callable(processor):
        logger.warning(f"Custom processing module {module.__name__} has no callable process function")
        return
    uids = list(_extract_device_uids(module))
    if not uids:
        logger.warning(f"Custom processing module {module.__name__} is missing DEVICE_UID/DEVICE_UIDS")
        return
    for uid in uids:
        normalized = _normalize_uid(uid)
        if normalized:
            registry[normalized] = processor

def _iter_module_names() -> Iterable[str]:
    package_dir = Path(__file__).resolve().parent
    for module in pkgutil.iter_modules([str(package_dir)]):
        if module.ispkg:
            continue
        name = module.name
        if name.startswith("_") or name == "__init__":
            continue
        yield name

def load_processors() -> int:
    """Load processors from modules in this package."""
    registry: Dict[str, DeviceProcessor] = {}
    importlib.invalidate_caches()
    for module_name in _iter_module_names():
        full_name = f"{__name__}.{module_name}"
        try:
            module = importlib.import_module(full_name)
        except Exception as exc:
            logger.warning(f"Failed to import custom processing module {full_name}: {exc}")
            continue
        _register_from_module(module, registry)
    _DEVICE_PROCESSORS.clear()
    _DEVICE_PROCESSORS.update(registry)
    return len(_DEVICE_PROCESSORS)

def reload_processors() -> int:
    """Reload processors after code changes."""
    registry: Dict[str, DeviceProcessor] = {}
    importlib.invalidate_caches()
    for module_name in _iter_module_names():
        full_name = f"{__name__}.{module_name}"
        try:
            if full_name in sys.modules:
                module = importlib.reload(sys.modules[full_name])
            else:
                module = importlib.import_module(full_name)
        except Exception as exc:
            logger.warning(f"Failed to reload custom processing module {full_name}: {exc}")
            continue
        _register_from_module(module, registry)
    _DEVICE_PROCESSORS.clear()
    _DEVICE_PROCESSORS.update(registry)
    return len(_DEVICE_PROCESSORS)

def get_device_processor(device_uid: str) -> Optional[DeviceProcessor]:
    """Return a custom processor for the device UID, if registered."""
    if not device_uid:
        return None
    return _DEVICE_PROCESSORS.get(_normalize_uid(device_uid))

# Load once on import.
load_processors()
