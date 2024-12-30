"""
Comprehensive test suite for AI Travel Platform ML models.

This module provides extensive testing coverage for:
- Persona model functionality and real-time adaptation
- Recommendation engine with incremental updates
- Model training lifecycle and performance validation

Version: 1.0.0
"""

import pytest  # v7.3.x
import numpy as np  # v1.23.x
import pandas as pd  # v1.5.x
import tensorflow as tf  # v2.12.x
from datetime import datetime
from typing import Dict, Any, List

from ..src.models.persona_model import PersonaModel
from ..src.models.recommendation_model import RecommendationModel
from ..src.services.model_trainer import ModelTrainer

# Test Environment Constants
TEST_ENV = 'development'
TEST_DATA_PATH = 'tests/data'
RANDOM_SEED = 42
MODEL_TIMEOUT = 300

@pytest.mark.ml
@pytest.mark.persona
class TestPersonaModel:
    """Test suite for persona model functionality and real-time adaptation."""

    def setup_method(self):
        """Initialize test environment with deterministic behavior."""
        # Set random seeds for reproducibility
        np.random.seed(RANDOM_SEED)
        tf.random.set_seed(RANDOM_SEED)

        # Initialize model
        self.model = PersonaModel(TEST_ENV)
        
        # Generate test data
        self.test_data = self._generate_test_data()
        
        # Configure test parameters
        self.model_config = {
            'learning_rate': 0.001,
            'batch_size': 32,
            'embedding_dim': 256
        }

    def _generate_test_data(self) -> Dict[str, np.ndarray]:
        """Generate synthetic test data for model validation."""
        num_samples = 1000
        return {
            'features': np.random.randn(num_samples, 10),
            'labels': np.random.randint(0, 2, size=(num_samples, 1)),
            'categorical': np.random.randint(0, 5, size=(num_samples, 3))
        }

    def test_model_initialization(self):
        """Verify proper model initialization and architecture."""
        assert self.model is not None, "Model failed to initialize"
        assert hasattr(self.model, 'model'), "Model architecture not created"
        
        # Verify model configuration
        assert self.model.model_config is not None, "Model configuration missing"
        assert isinstance(self.model.preprocessor_state, dict), "Preprocessor state not initialized"
        
        # Check model architecture
        model_layers = self.model.model.layers
        assert len(model_layers) > 0, "Model has no layers"
        
        # Verify optimizer configuration
        assert isinstance(self.model.optimizer, tf.keras.optimizers.Optimizer), "Invalid optimizer"

    def test_model_training(self):
        """Test model training with real-time adaptation."""
        # Prepare training data
        X_train = self.test_data['features']
        y_train = self.test_data['labels']
        
        # Initial training
        metrics = self.model.train(X_train, y_train, epochs=5)
        
        # Verify training metrics
        assert 'loss' in metrics, "Training loss not reported"
        assert 'accuracy' in metrics, "Accuracy metric missing"
        assert metrics['loss'] > 0, "Invalid loss value"
        assert 0 <= metrics['accuracy'] <= 1, "Invalid accuracy value"
        
        # Test real-time adaptation
        adaptation_data = {
            'features': X_train[:100],
            'labels': y_train[:100]
        }
        
        self.model.adapt(adaptation_data)
        assert self.model.model_state['training_iterations'] > 0, "Adaptation not recorded"

    def test_prediction_generation(self):
        """Verify prediction functionality and confidence scoring."""
        # Train model with minimal data
        self.model.train(
            self.test_data['features'][:100],
            self.test_data['labels'][:100],
            epochs=2
        )
        
        # Generate predictions
        test_input = self.test_data['features'][:10]
        predictions, confidence = self.model.predict(test_input)
        
        # Verify predictions
        assert predictions.shape[0] == test_input.shape[0], "Prediction shape mismatch"
        assert confidence.shape[0] == test_input.shape[0], "Confidence shape mismatch"
        assert np.all(confidence >= 0) and np.all(confidence <= 1), "Invalid confidence scores"

    def test_model_persistence(self, tmp_path):
        """Test model save and load functionality."""
        # Train model
        self.model.train(
            self.test_data['features'][:100],
            self.test_data['labels'][:100],
            epochs=2
        )
        
        # Save model
        save_path = tmp_path / "test_model"
        save_success = self.model.save(str(save_path))
        assert save_success, "Model save failed"
        
        # Load model
        new_model = PersonaModel(TEST_ENV)
        load_success = new_model.load(str(save_path))
        assert load_success, "Model load failed"
        
        # Verify loaded model
        test_input = self.test_data['features'][:5]
        original_pred = self.model.predict(test_input)
        loaded_pred = new_model.predict(test_input)
        np.testing.assert_array_almost_equal(
            original_pred[0], loaded_pred[0],
            decimal=5, err_msg="Loaded model predictions differ"
        )

@pytest.mark.ml
@pytest.mark.recommendation
class TestRecommendationModel:
    """Test suite for recommendation model functionality."""

    def setup_method(self):
        """Initialize test environment for recommendation model."""
        np.random.seed(RANDOM_SEED)
        tf.random.set_seed(RANDOM_SEED)
        
        self.model = RecommendationModel(TEST_ENV)
        self.test_data = self._generate_recommendation_data()

    def _generate_recommendation_data(self) -> pd.DataFrame:
        """Generate synthetic recommendation test data."""
        num_samples = 1000
        return pd.DataFrame({
            'user_id': np.random.randint(1, 100, num_samples),
            'item_id': np.random.randint(1, 500, num_samples),
            'rating': np.random.uniform(1, 5, num_samples),
            'timestamp': pd.date_range(start='2023-01-01', periods=num_samples)
        })

    def test_recommendation_generation(self):
        """Test recommendation generation and ranking."""
        # Train model
        self.model.train(self.test_data, epochs=2)
        
        # Generate recommendations
        test_user = pd.DataFrame({
            'user_id': [1],
            'features': [np.random.randn(10)]
        })
        
        recommendations = self.model.predict(test_user, n_recommendations=5)
        
        # Verify recommendations
        assert len(recommendations) == 5, "Incorrect number of recommendations"
        assert 'score' in recommendations.columns, "Recommendation scores missing"
        assert 'confidence' in recommendations.columns, "Confidence scores missing"
        assert recommendations['score'].is_monotonic_decreasing, "Recommendations not properly ranked"

    def test_incremental_updates(self):
        """Test incremental model updates and performance monitoring."""
        # Initial training
        initial_metrics = self.model.train(self.test_data[:800], epochs=2)
        
        # Incremental update
        update_data = self.test_data[800:]
        update_metrics = self.model.update(update_data)
        
        # Verify update metrics
        assert 'loss_delta' in update_metrics, "Update loss delta missing"
        assert 'timestamp' in update_metrics, "Update timestamp missing"
        assert len(self.model.model_state['update_history']) > 0, "Update history not recorded"

    def test_diversity_enhancement(self):
        """Test recommendation diversity enhancement."""
        self.model.train(self.test_data, epochs=2)
        
        # Generate diverse recommendations
        test_user = pd.DataFrame({
            'user_id': [1],
            'features': [np.random.randn(10)]
        })
        
        recommendations = self.model.predict(test_user, n_recommendations=10)
        
        # Verify diversity
        scores = recommendations['score'].values
        score_diffs = np.diff(scores)
        assert np.mean(score_diffs) > 0, "Recommendations lack diversity"