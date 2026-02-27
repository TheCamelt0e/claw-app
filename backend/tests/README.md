# CLAW Backend Tests

## Running Tests

```bash
# Install pytest
pip install pytest pytest-asyncio

# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_claw_model.py

# Run with coverage
pytest --cov=app tests/
```

## Test Structure

- `test_categorization.py` - AI categorization logic tests
- `test_claw_model.py` - Database model tests

## Writing New Tests

1. Add fixtures to `conftest.py` if needed
2. Create test functions with descriptive names
3. Use the `db_session` and `test_user` fixtures for database tests

Example:
```python
def test_my_feature(db_session, test_user):
    # Test code here
    pass
```
