package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByReadAtNullOrderByCreatedAtDesc();
    List<Notification> findByReadAtNullAndModuleOrderByCreatedAtDesc(String module);
    long countByReadAtNull();
    List<Notification> findByEntityTypeAndEntityId(String entityType, Long entityId);
}
