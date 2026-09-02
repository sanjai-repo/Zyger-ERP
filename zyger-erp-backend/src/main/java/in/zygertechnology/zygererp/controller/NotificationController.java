package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.entity.Notification;
import in.zygertechnology.zygererp.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService service;

    @GetMapping
    public List<Notification> unread(@RequestParam(required = false) String module) {
        return (module == null || module.isBlank())
                ? service.getUnread()
                : service.getUnreadByModule(module);
    }

    @GetMapping("/count")
    public Map<String, Object> count() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("unreadCount", service.getUnreadCount());
        return out;
    }

    @PutMapping("/{id}/read")
    public void markRead(@PathVariable Long id) {
        service.markAsRead(id);
    }

    @PutMapping("/read-all")
    public void markAllRead() {
        service.markAllAsRead();
    }
}
