import logging
import sys

def setup_logger(name: str, level: str = "INFO"):
    """Setup logger with good format"""
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level))

    # Console Handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(getattr(logging, level))

    # Format
    formatter = logging.Formatter(
      '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
      datefmt='%Y-%m-d %H:%M:%S'
    )
    handler.setFormatter(formatter)

    logger.addHandler(handler)
    return logger

logger = setup_logger("IoT_Monitoring_System")

