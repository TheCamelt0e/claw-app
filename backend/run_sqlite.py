"""
Simple script to run the CLAW backend with SQLite
No Docker or PostgreSQL required!
"""
import uvicorn

if __name__ == "__main__":
    print("CLAW API Starting (SQLite version)")
    print("=" * 50)
    print("API will be available at: http://localhost:8000")
    print("Interactive docs at: http://localhost:8000/docs")
    print("=" * 50)
    print()
    
    uvicorn.run(
        "app.main_sqlite:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
