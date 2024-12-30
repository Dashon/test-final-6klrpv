from setuptools import setup, find_packages

VERSION = '1.0.0'
DESCRIPTION = 'AI Travel Platform ML Service - Persona-based recommendation and NLP models'

def read_requirements():
    """Read package dependencies from requirements.txt"""
    with open('requirements.txt', 'r', encoding='utf-8') as f:
        return [line.strip() for line in f if line.strip() and not line.startswith('#')]

setup(
    name='ai-travel-ml-service',
    version=VERSION,
    description=DESCRIPTION,
    long_description=open('README.md', 'r', encoding='utf-8').read(),
    long_description_content_type='text/markdown',
    author='AI Travel Platform Team',
    author_email='ml-team@ai-travel-platform.com',
    url='https://github.com/ai-travel-platform/ml-service',
    packages=find_packages(where='src'),
    package_dir={'': 'src'},
    python_requires='>=3.9',
    install_requires=[
        # Core ML frameworks
        'tensorflow>=2.12.0,<2.13.0',  # TensorFlow for recommendation engine
        'torch>=2.0.0,<2.1.0',         # PyTorch for NLP models
        
        # Data processing
        'numpy>=1.23.0,<1.24.0',       # Numerical computations
        'pandas>=1.5.0,<1.6.0',        # Data manipulation
        'scikit-learn>=1.2.0,<1.3.0',  # ML utilities and anomaly detection
        
        # NLP dependencies
        'transformers>=4.30.0,<4.31.0', # Hugging Face transformers
        'tokenizers>=0.13.0,<0.14.0',   # Fast tokenization
        
        # API and server
        'fastapi>=0.95.0,<0.96.0',     # API framework
        'uvicorn>=0.22.0,<0.23.0',     # ASGI server
        
        # Utilities
        'pyyaml>=6.0.0,<6.1.0',        # Configuration management
        'python-dotenv>=1.0.0,<1.1.0',  # Environment variables
    ],
    extras_require={
        'dev': [
            'pytest>=7.3.1',            # Testing framework
            'black>=23.3.0',            # Code formatting
            'isort>=5.12.0',            # Import sorting
            'mypy>=1.3.0',              # Type checking
        ],
        'docs': [
            'sphinx>=6.2.1',            # Documentation generator
            'sphinx-rtd-theme>=1.2.0',  # Documentation theme
        ],
    },
    entry_points={
        'console_scripts': [
            'ml-service=ml_service.main:main',
        ],
    },
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Topic :: Scientific/Engineering :: Artificial Intelligence',
        'Topic :: Software Development :: Libraries :: Python Modules',
    ],
    keywords='machine-learning, nlp, recommendation-engine, travel, ai',
    project_urls={
        'Bug Reports': 'https://github.com/ai-travel-platform/ml-service/issues',
        'Documentation': 'https://ai-travel-platform.readthedocs.io/',
        'Source': 'https://github.com/ai-travel-platform/ml-service',
    },
)