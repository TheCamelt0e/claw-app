"""
Simple test runner for CLAW backend
"""
import sys
import subprocess

def main():
    """Run pytest with nice output"""
    print("🧪 Running CLAW Backend Tests...\n")
    
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "-v", "--tb=short"],
        cwd=".",
        capture_output=False
    )
    
    if result.returncode == 0:
        print("\n✅ All tests passed!")
    else:
        print("\n❌ Some tests failed")
    
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
