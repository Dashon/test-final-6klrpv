"""
Model Configuration Manager for AI Travel Platform ML Services

This module provides centralized configuration management for all ML models including:
- Recommendation Engine (TensorFlow 2.12.x)
- NLP Chat Model (PyTorch 2.0.x)
- Sentiment Analysis (TensorFlow Lite)
- Anomaly Detection (Scikit-learn 1.2.x)

Features:
- Environment-specific configuration management
- Configuration validation and schema checking
- Performance-optimized caching
- Real-time adaptation support
"""

import os
from typing import Dict, Any, Optional
import yaml
from dataclasses import dataclass
import logging
from functools import lru_cache

# Global Constants
CONFIG_PATH = os.getenv('ML_CONFIG_PATH', 'config/models')
ENVIRONMENTS = {
    'development': 'dev',
    'staging': 'stg',
    'production': 'prod'
}

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ConfigValidationError(Exception):
    """Custom exception for configuration validation errors."""
    pass

class ModelConfig:
    """
    Configuration manager for ML models with environment-specific settings,
    caching, and validation support.
    """
    
    def __init__(self, env: str) -> None:
        """
        Initialize the configuration manager.

        Args:
            env (str): Environment identifier ('development', 'staging', 'production')

        Raises:
            ValueError: If environment is not supported
            ConfigValidationError: If configuration validation fails
        """
        if env not in ENVIRONMENTS:
            raise ValueError(f"Environment must be one of {list(ENVIRONMENTS.keys())}")
        
        self.env = env
        self._cache: Dict[str, Any] = {}
        self.config_path = os.path.join(CONFIG_PATH, ENVIRONMENTS[env])
        
        # Initialize base configuration
        try:
            self._load_base_config()
        except Exception as e:
            logger.error(f"Failed to load base configuration: {str(e)}")
            raise ConfigValidationError(f"Configuration initialization failed: {str(e)}")

    def _load_base_config(self) -> None:
        """Load and validate base configuration files."""
        base_config_path = os.path.join(CONFIG_PATH, 'base.yml')
        env_config_path = os.path.join(self.config_path, 'config.yml')

        try:
            with open(base_config_path, 'r') as f:
                self.config = yaml.safe_load(f)
            
            # Load environment overrides if they exist
            if os.path.exists(env_config_path):
                with open(env_config_path, 'r') as f:
                    env_config = yaml.safe_load(f)
                    self.config = self._merge_configs(self.config, env_config)
        except yaml.YAMLError as e:
            raise ConfigValidationError(f"YAML parsing error: {str(e)}")
        except FileNotFoundError as e:
            raise ConfigValidationError(f"Configuration file not found: {str(e)}")

    @staticmethod
    def _merge_configs(base: Dict, override: Dict) -> Dict:
        """
        Recursively merge configuration dictionaries with override precedence.
        
        Args:
            base (Dict): Base configuration
            override (Dict): Override configuration
            
        Returns:
            Dict: Merged configuration
        """
        merged = base.copy()
        for key, value in override.items():
            if isinstance(value, dict) and key in merged:
                merged[key] = ModelConfig._merge_configs(merged[key], value)
            else:
                merged[key] = value
        return merged

    @lru_cache(maxsize=128)
    def get_recommendation_config(self) -> Dict[str, Any]:
        """
        Retrieve and validate recommendation model configuration.

        Returns:
            Dict[str, Any]: Validated recommendation model configuration

        Raises:
            ConfigValidationError: If configuration validation fails
        """
        cache_key = 'recommendation'
        if cache_key not in self._cache:
            config = self.config.get('recommendation_model', {})
            self._validate_recommendation_config(config)
            self._cache[cache_key] = config
            logger.info(f"Loaded recommendation model configuration for {self.env}")
        
        return self._cache[cache_key]

    @lru_cache(maxsize=128)
    def get_nlp_config(self) -> Dict[str, Any]:
        """
        Retrieve and validate NLP model configuration.

        Returns:
            Dict[str, Any]: Validated NLP model configuration

        Raises:
            ConfigValidationError: If configuration validation fails
        """
        cache_key = 'nlp'
        if cache_key not in self._cache:
            config = self.config.get('nlp_model', {})
            self._validate_nlp_config(config)
            self._cache[cache_key] = config
            logger.info(f"Loaded NLP model configuration for {self.env}")
        
        return self._cache[cache_key]

    @lru_cache(maxsize=128)
    def get_sentiment_config(self) -> Dict[str, Any]:
        """
        Retrieve and validate sentiment analysis model configuration.

        Returns:
            Dict[str, Any]: Validated sentiment analysis configuration

        Raises:
            ConfigValidationError: If configuration validation fails
        """
        cache_key = 'sentiment'
        if cache_key not in self._cache:
            config = self.config.get('sentiment_model', {})
            self._validate_sentiment_config(config)
            self._cache[cache_key] = config
            logger.info(f"Loaded sentiment analysis configuration for {self.env}")
        
        return self._cache[cache_key]

    @lru_cache(maxsize=128)
    def get_anomaly_config(self) -> Dict[str, Any]:
        """
        Retrieve and validate anomaly detection model configuration.

        Returns:
            Dict[str, Any]: Validated anomaly detection configuration

        Raises:
            ConfigValidationError: If configuration validation fails
        """
        cache_key = 'anomaly'
        if cache_key not in self._cache:
            config = self.config.get('anomaly_model', {})
            self._validate_anomaly_config(config)
            self._cache[cache_key] = config
            logger.info(f"Loaded anomaly detection configuration for {self.env}")
        
        return self._cache[cache_key]

    def _validate_recommendation_config(self, config: Dict[str, Any]) -> None:
        """Validate recommendation model configuration schema and parameters."""
        required_keys = {'model_architecture', 'hyperparameters', 'training_settings'}
        if not all(key in config for key in required_keys):
            raise ConfigValidationError(f"Missing required keys in recommendation config: {required_keys}")

    def _validate_nlp_config(self, config: Dict[str, Any]) -> None:
        """Validate NLP model configuration schema and parameters."""
        required_keys = {'model_architecture', 'tokenizer_settings', 'training_parameters'}
        if not all(key in config for key in required_keys):
            raise ConfigValidationError(f"Missing required keys in NLP config: {required_keys}")

    def _validate_sentiment_config(self, config: Dict[str, Any]) -> None:
        """Validate sentiment analysis configuration schema and parameters."""
        required_keys = {'model_settings', 'quantization_parameters', 'inference_settings'}
        if not all(key in config for key in required_keys):
            raise ConfigValidationError(f"Missing required keys in sentiment config: {required_keys}")

    def _validate_anomaly_config(self, config: Dict[str, Any]) -> None:
        """Validate anomaly detection configuration schema and parameters."""
        required_keys = {'algorithm_settings', 'detection_thresholds', 'update_frequency'}
        if not all(key in config for key in required_keys):
            raise ConfigValidationError(f"Missing required keys in anomaly config: {required_keys}")