package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.Notification;
import in.zygertechnology.zygererp.repo.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository repo;

    /**
     * Create and persist a notification record.
     */
    @Transactional
    public Notification notify(String eventType, String module, String entityType, Long entityId,
                               String severity, String message, String entityRef) {
        try {
            Notification n = Notification.builder()
                    .eventType(eventType)
                    .module(module)
                    .entityType(entityType)
                    .entityId(entityId)
                    .severity(severity)
                    .message(message)
                    .entityRef(entityRef)
                    .build();
            return repo.save(n);
        } catch (Exception ex) {
            // Never let notification persistence break the calling job/flow.
            log.error("Failed to persist notification eventType={} entityRef={}", eventType, entityRef, ex);
            return null;
        }
    }

    public List<Notification> getUnread() {
        return repo.findByReadAtNullOrderByCreatedAtDesc();
    }

    public List<Notification> getUnreadByModule(String module) {
        return repo.findByReadAtNullAndModuleOrderByCreatedAtDesc(module);
    }

    public long getUnreadCount() {
        return repo.countByReadAtNull();
    }

    @Transactional
    public void markAsRead(Long id) {
        repo.findById(id).ifPresent(n -> n.setReadAt(Instant.now()));
    }

    @Transactional
    public void markAllAsRead() {
        Instant now = Instant.now();
        for (Notification n : repo.findByReadAtNullOrderByCreatedAtDesc()) {
            n.setReadAt(now);
        }
    }
}
