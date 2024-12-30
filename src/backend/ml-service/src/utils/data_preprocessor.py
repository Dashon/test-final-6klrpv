"""
Advanced Data Preprocessor for AI Travel Platform ML Models

This module provides comprehensive data preprocessing capabilities for multiple ML model types
including recommendation engine, NLP chat model, sentiment analysis, and anomaly detection.

Features:
- Model-specific preprocessing pipelines
- Real-time adaptation support
- State persistence
- Comprehensive validation
- Performance optimization through caching
- Support for multiple input types

Version: 1.0.0
"""

import numpy as np  # v1.23.x
import pandas as pd  # v1.5.x
from sklearn.preprocessing import StandardScaler, LabelEncoder, MinMaxScaler  # v1.2.x
import tensorflow as tf  # v2.12.x
from typing import Dict, List, Union, Any, Optional
import logging
import json
import os
from pathlib import Path
import pickle
from datetime import datetime
from ..config.model_config import ModelConfig

# Global Constants
MAX_VOCAB_SIZE = 10000
MAX_SEQUENCE_LENGTH = 512
CATEGORICAL_FEATURES = ['destination_type', 'travel_style', 'accommodation_type']
NUMERICAL_FEATURES = ['budget', 'duration', 'group_size']
SUPPORTED_MODEL_TYPES = ['recommendation', 'nlp', 'sentiment', 'anomaly']

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PreprocessingError(Exception):
    """Custom exception for preprocessing errors."""
    pass

class DataPreprocessor:
    """
    Advanced data preprocessing class handling multiple input types and model-specific
    transformations with real-time adaptation capabilities and state persistence.
    """
    
    def __init__(self, model_type: str, env: str) -> None:
        """
        Initialize the data preprocessor with model-specific configuration.

        Args:
            model_type (str): Type of model ('recommendation', 'nlp', 'sentiment', 'anomaly')
            env (str): Environment ('development', 'staging', 'production')

        Raises:
            ValueError: If model_type is not supported
            PreprocessingError: If initialization fails
        """
        if model_type not in SUPPORTED_MODEL_TYPES:
            raise ValueError(f"Unsupported model type. Must be one of {SUPPORTED_MODEL_TYPES}")
        
        self.model_type = model_type
        self.env = env
        
        try:
            # Initialize model configuration
            self.config = ModelConfig(env)
            
            # Initialize preprocessing state
            self.preprocessor_state = {
                'model_type': model_type,
                'created_at': datetime.utcnow().isoformat(),
                'version': '1.0.0',
                'last_updated': None,
                'statistics': {}
            }
            
            # Initialize transformers based on model type
            self.transformers = {
                'numerical': StandardScaler(),
                'categorical': {},  # Will hold LabelEncoders
                'text': None  # Will be initialized based on model type
            }
            
            # Initialize cache
            self.cache = {
                'frequent_values': {},
                'statistics': {},
                'last_updated': None
            }
            
            self._initialize_model_specific_components()
            logger.info(f"Initialized DataPreprocessor for {model_type} model in {env} environment")
            
        except Exception as e:
            logger.error(f"Failed to initialize DataPreprocessor: {str(e)}")
            raise PreprocessingError(f"Initialization failed: {str(e)}")

    def _initialize_model_specific_components(self) -> None:
        """Initialize model-specific preprocessing components."""
        try:
            if self.model_type == 'recommendation':
                config = self.config.get_recommendation_config()
                self.transformers['text'] = tf.keras.preprocessing.text.Tokenizer(
                    num_words=MAX_VOCAB_SIZE,
                    filters='!"#$%&()*+,-./:;<=>?@[\\]^_`{|}~\t\n',
                    lower=True
                )
            elif self.model_type == 'nlp':
                config = self.config.get_nlp_config()
                self.transformers['text'] = tf.keras.preprocessing.text.Tokenizer(
                    num_words=config.get('tokenizer_settings', {}).get('vocab_size', MAX_VOCAB_SIZE)
                )
            elif self.model_type == 'sentiment':
                for feature in CATEGORICAL_FEATURES:
                    self.transformers['categorical'][feature] = LabelEncoder()
            elif self.model_type == 'anomaly':
                self.transformers['numerical'] = MinMaxScaler()
                
        except Exception as e:
            logger.error(f"Failed to initialize model-specific components: {str(e)}")
            raise PreprocessingError(f"Model-specific initialization failed: {str(e)}")

    def fit_transform(self, data: Union[pd.DataFrame, np.ndarray, List[str]]) -> Union[pd.DataFrame, np.ndarray]:
        """
        Fit preprocessor on training data and transform it.

        Args:
            data: Input data in supported format

        Returns:
            Preprocessed data

        Raises:
            PreprocessingError: If preprocessing fails
        """
        try:
            # Convert input to appropriate format
            data = self._validate_and_convert_input(data)
            
            # Update statistics
            self._update_statistics(data)
            
            # Apply model-specific preprocessing
            if self.model_type == 'recommendation':
                processed_data = self._process_recommendation_data(data, fit=True)
            elif self.model_type == 'nlp':
                processed_data = self._process_nlp_data(data, fit=True)
            elif self.model_type == 'sentiment':
                processed_data = self._process_sentiment_data(data, fit=True)
            else:  # anomaly
                processed_data = self._process_anomaly_data(data, fit=True)
            
            # Update state
            self.preprocessor_state['last_updated'] = datetime.utcnow().isoformat()
            
            logger.info(f"Successfully fit and transformed data for {self.model_type} model")
            return processed_data
            
        except Exception as e:
            logger.error(f"Failed to fit and transform data: {str(e)}")
            raise PreprocessingError(f"Fit transform failed: {str(e)}")

    def transform(self, data: Union[pd.DataFrame, np.ndarray, List[str]]) -> Union[pd.DataFrame, np.ndarray]:
        """
        Transform new data using fitted preprocessor.

        Args:
            data: Input data in supported format

        Returns:
            Preprocessed data

        Raises:
            PreprocessingError: If transformation fails
        """
        try:
            # Validate preprocessor state
            if not self.preprocessor_state.get('last_updated'):
                raise PreprocessingError("Preprocessor must be fitted before transform")
            
            # Convert input to appropriate format
            data = self._validate_and_convert_input(data)
            
            # Apply model-specific preprocessing
            if self.model_type == 'recommendation':
                processed_data = self._process_recommendation_data(data, fit=False)
            elif self.model_type == 'nlp':
                processed_data = self._process_nlp_data(data, fit=False)
            elif self.model_type == 'sentiment':
                processed_data = self._process_sentiment_data(data, fit=False)
            else:  # anomaly
                processed_data = self._process_anomaly_data(data, fit=False)
            
            logger.info(f"Successfully transformed data for {self.model_type} model")
            return processed_data
            
        except Exception as e:
            logger.error(f"Failed to transform data: {str(e)}")
            raise PreprocessingError(f"Transform failed: {str(e)}")

    def save_state(self, path: str) -> bool:
        """
        Save preprocessor state to disk.

        Args:
            path: Path to save state

        Returns:
            bool: Success status
        """
        try:
            save_path = Path(path)
            save_path.mkdir(parents=True, exist_ok=True)
            
            # Save preprocessor state
            state_path = save_path / 'preprocessor_state.json'
            with open(state_path, 'w') as f:
                json.dump(self.preprocessor_state, f)
            
            # Save transformers
            transformer_path = save_path / 'transformers.pkl'
            with open(transformer_path, 'wb') as f:
                pickle.dump(self.transformers, f)
            
            # Save cache
            cache_path = save_path / 'cache.json'
            with open(cache_path, 'w') as f:
                json.dump(self.cache, f)
            
            logger.info(f"Successfully saved preprocessor state to {path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save preprocessor state: {str(e)}")
            return False

    def load_state(self, path: str) -> bool:
        """
        Load preprocessor state from disk.

        Args:
            path: Path to load state from

        Returns:
            bool: Success status
        """
        try:
            load_path = Path(path)
            
            # Load preprocessor state
            state_path = load_path / 'preprocessor_state.json'
            with open(state_path, 'r') as f:
                self.preprocessor_state = json.load(f)
            
            # Load transformers
            transformer_path = load_path / 'transformers.pkl'
            with open(transformer_path, 'rb') as f:
                self.transformers = pickle.load(f)
            
            # Load cache
            cache_path = load_path / 'cache.json'
            with open(cache_path, 'r') as f:
                self.cache = json.load(f)
            
            logger.info(f"Successfully loaded preprocessor state from {path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load preprocessor state: {str(e)}")
            return False

    def _validate_and_convert_input(self, data: Union[pd.DataFrame, np.ndarray, List[str]]) -> Union[pd.DataFrame, np.ndarray]:
        """Validate and convert input data to appropriate format."""
        if isinstance(data, list):
            if self.model_type in ['nlp', 'sentiment']:
                return np.array(data)
            return pd.DataFrame(data)
        elif isinstance(data, np.ndarray):
            if self.model_type in ['nlp', 'sentiment']:
                return data
            return pd.DataFrame(data)
        elif isinstance(data, pd.DataFrame):
            return data
        else:
            raise PreprocessingError(f"Unsupported input type: {type(data)}")

    def _update_statistics(self, data: Union[pd.DataFrame, np.ndarray]) -> None:
        """Update preprocessing statistics."""
        try:
            stats = {
                'sample_count': len(data),
                'timestamp': datetime.utcnow().isoformat()
            }
            
            if isinstance(data, pd.DataFrame):
                stats.update({
                    'numerical_features': {
                        feature: {
                            'mean': float(data[feature].mean()),
                            'std': float(data[feature].std())
                        } for feature in NUMERICAL_FEATURES if feature in data.columns
                    }
                })
            
            self.preprocessor_state['statistics'] = stats
            
        except Exception as e:
            logger.warning(f"Failed to update statistics: {str(e)}")

    def _process_recommendation_data(self, data: pd.DataFrame, fit: bool = False) -> np.ndarray:
        """Process data for recommendation model."""
        if fit:
            # Fit numerical features
            self.transformers['numerical'].fit(data[NUMERICAL_FEATURES])
            
            # Fit categorical features
            for feature in CATEGORICAL_FEATURES:
                if feature in data.columns:
                    self.transformers['categorical'][feature] = LabelEncoder()
                    self.transformers['categorical'][feature].fit(data[feature])
        
        # Transform numerical features
        numerical_data = self.transformers['numerical'].transform(data[NUMERICAL_FEATURES])
        
        # Transform categorical features
        categorical_data = np.array([
            self.transformers['categorical'][feature].transform(data[feature])
            for feature in CATEGORICAL_FEATURES if feature in data.columns
        ]).T
        
        return np.hstack([numerical_data, categorical_data])

    def _process_nlp_data(self, data: Union[np.ndarray, List[str]], fit: bool = False) -> np.ndarray:
        """Process data for NLP model."""
        if fit:
            self.transformers['text'].fit_on_texts(data)
        
        sequences = self.transformers['text'].texts_to_sequences(data)
        return tf.keras.preprocessing.sequence.pad_sequences(
            sequences,
            maxlen=MAX_SEQUENCE_LENGTH,
            padding='post',
            truncating='post'
        )

    def _process_sentiment_data(self, data: Union[pd.DataFrame, np.ndarray], fit: bool = False) -> np.ndarray:
        """Process data for sentiment analysis model."""
        if isinstance(data, np.ndarray):
            return self._process_nlp_data(data, fit)
        else:
            return self._process_recommendation_data(data, fit)

    def _process_anomaly_data(self, data: pd.DataFrame, fit: bool = False) -> np.ndarray:
        """Process data for anomaly detection model."""
        if fit:
            self.transformers['numerical'].fit(data[NUMERICAL_FEATURES])
        
        return self.transformers['numerical'].transform(data[NUMERICAL_FEATURES])