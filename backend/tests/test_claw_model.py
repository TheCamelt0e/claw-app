"""
Tests for Claw model
"""
import pytest
from datetime import datetime, timedelta

from app.models.claw_sqlite import Claw


class TestClawModel:
    """Test Claw model functionality"""
    
    def test_create_claw(self, db_session, test_user):
        """Should create a basic claw"""
        claw = Claw(
            user_id=test_user.id,
            content="Test content",
            title="Test Title",
            category="task"
        )
        db_session.add(claw)
        db_session.commit()
        
        assert claw.id is not None
        assert claw.status == "active"
        assert claw.user_id == test_user.id
    
    def test_tags_json_handling(self, db_session, test_user):
        """Should handle JSON tags correctly"""
        claw = Claw(
            user_id=test_user.id,
            content="Test",
            title="Test"
        )
        claw.set_tags(["tag1", "tag2", "tag3"])
        db_session.add(claw)
        db_session.commit()
        
        # Refresh from DB
        db_session.refresh(claw)
        tags = claw.get_tags()
        
        assert "tag1" in tags
        assert "tag2" in tags
        assert "tag3" in tags
    
    def test_empty_tags_returns_list(self, db_session, test_user):
        """Empty tags should return empty list, not None"""
        claw = Claw(
            user_id=test_user.id,
            content="Test",
            title="Test"
        )
        # Don't set tags
        db_session.add(claw)
        db_session.commit()
        
        assert claw.get_tags() == []
    
    def test_is_expired(self, db_session, test_user):
        """Should correctly detect expired claws"""
        claw = Claw(
            user_id=test_user.id,
            content="Test",
            title="Test",
            expires_at=datetime.utcnow() - timedelta(days=1)  # Yesterday
        )
        db_session.add(claw)
        db_session.commit()
        
        assert claw.is_expired() is True
    
    def test_not_expired(self, db_session, test_user):
        """Should correctly detect non-expired claws"""
        claw = Claw(
            user_id=test_user.id,
            content="Test",
            title="Test",
            expires_at=datetime.utcnow() + timedelta(days=7)  # Next week
        )
        db_session.add(claw)
        db_session.commit()
        
        assert claw.is_expired() is False
    
    def test_can_resurface(self, db_session, test_user):
        """Should correctly determine if claw can resurface"""
        claw = Claw(
            user_id=test_user.id,
            content="Test",
            title="Test",
            status="active",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        db_session.add(claw)
        db_session.commit()
        
        assert claw.can_resurface() is True
    
    def test_cannot_resurface_if_expired(self, db_session, test_user):
        """Expired claws should not resurface"""
        claw = Claw(
            user_id=test_user.id,
            content="Test",
            title="Test",
            status="active",
            expires_at=datetime.utcnow() - timedelta(days=1)
        )
        db_session.add(claw)
        db_session.commit()
        
        assert claw.can_resurface() is False
    
    def test_cannot_resurface_if_completed(self, db_session, test_user):
        """Completed claws should not resurface"""
        claw = Claw(
            user_id=test_user.id,
            content="Test",
            title="Test",
            status="completed",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        db_session.add(claw)
        db_session.commit()
        
        assert claw.can_resurface() is False
    
    def test_is_vip_by_flag(self, db_session, test_user):
        """Should detect VIP by is_priority flag"""
        claw = Claw(
            user_id=test_user.id,
            content="Test",
            title="Test",
            is_priority=True
        )
        db_session.add(claw)
        db_session.commit()
        
        assert claw.is_vip() is True
    
    def test_is_vip_by_emoji(self, db_session, test_user):
        """Should detect VIP by emoji in title"""
        claw = Claw(
            user_id=test_user.id,
            content="Test",
            title="🔥 VIP Task"
        )
        db_session.add(claw)
        db_session.commit()
        
        assert claw.is_vip() is True
    
    def test_is_vip_by_tags(self, db_session, test_user):
        """Should detect VIP by vip/priority tags"""
        claw = Claw(
            user_id=test_user.id,
            content="Test",
            title="Test"
        )
        claw.set_tags(["vip", "task"])
        db_session.add(claw)
        db_session.commit()
        
        assert claw.is_vip() is True
    
    def test_not_vip(self, db_session, test_user):
        """Should correctly identify non-VIP claws"""
        claw = Claw(
            user_id=test_user.id,
            content="Test",
            title="Normal Task",
            is_priority=False
        )
        claw.set_tags(["task", "remember"])
        db_session.add(claw)
        db_session.commit()
        
        assert claw.is_vip() is False
    
    def test_to_dict_structure(self, db_session, test_user):
        """to_dict should return correct structure"""
        claw = Claw(
            user_id=test_user.id,
            content="Test content",
            title="Test Title",
            category="task",
            status="active"
        )
        claw.set_tags(["task"])
        db_session.add(claw)
        db_session.commit()
        
        data = claw.to_dict()
        
        assert "id" in data
        assert "content" in data
        assert "title" in data
        assert "category" in data
        assert "tags" in data
        assert "status" in data
        assert "is_vip" in data
        assert "is_priority" in data
        assert data["content"] == "Test content"
