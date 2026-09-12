package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.Notification;
import in.zygertechnology.zygererp.repo.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationService notificationService;

    private Notification sampleNotification;

    @BeforeEach
    void setUp() {
        sampleNotification = Notification.builder()
                .id(1L)
                .eventType("DOC_CREATED")
                .module("SALES")
                .entityType("sales-order")
                .entityId(100L)
                .severity("INFO")
                .message("Sales order created")
                .entityRef("SO-001")
                .build();
    }

    @Test
    @DisplayName("notify() should successfully save notification record")
    void testNotifySuccess() {
        when(notificationRepository.save(any(Notification.class))).thenReturn(sampleNotification);

        Notification result = notificationService.notify(
                "DOC_CREATED", "SALES", "sales-order", 100L, "INFO", "Sales order created", "SO-001"
        );

        assertNotNull(result);
        assertEquals("SO-001", result.getEntityRef());
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    @Test
    @DisplayName("notify() should handle exceptions gracefully without throwing")
    void testNotifyExceptionHandled() {
        when(notificationRepository.save(any(Notification.class))).thenThrow(new RuntimeException("DB error"));

        Notification result = notificationService.notify(
                "DOC_CREATED", "SALES", "sales-order", 100L, "INFO", "Sales order created", "SO-001"
        );

        assertNull(result);
    }

    @Test
    @DisplayName("getUnread() should return list from repository")
    void testGetUnread() {
        when(notificationRepository.findByReadAtNullOrderByCreatedAtDesc()).thenReturn(List.of(sampleNotification));

        List<Notification> unread = notificationService.getUnread();

        assertEquals(1, unread.size());
        assertEquals("SO-001", unread.get(0).getEntityRef());
    }

    @Test
    @DisplayName("markAsRead() should update readAt timestamp")
    void testMarkAsRead() {
        when(notificationRepository.findById(1L)).thenReturn(Optional.of(sampleNotification));

        notificationService.markAsRead(1L);

        assertNotNull(sampleNotification.getReadAt());
    }

    @Test
    @DisplayName("markAllAsRead() should update readAt for all unread notifications")
    void testMarkAllAsRead() {
        when(notificationRepository.findByReadAtNullOrderByCreatedAtDesc()).thenReturn(List.of(sampleNotification));

        notificationService.markAllAsRead();

        assertNotNull(sampleNotification.getReadAt());
    }
}
