package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.AuditLog;
import in.zygertechnology.zygererp.entity.AppUser;
import in.zygertechnology.zygererp.repo.AuditLogRepository;
import in.zygertechnology.zygererp.repo.UserRepository;
import in.zygertechnology.zygererp.security.CurrentUserRoles;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    @Mock private AuditLogRepository auditLogs;
    @Mock private UserRepository users;
    @Mock private HttpServletRequest request;
    @InjectMocks private AuditLogService auditLogService;

    @Nested
    @DisplayName("record()")
    class RecordTests {
        @Test
        @DisplayName("Should save audit log entry")
        void saveAuditEntry() {
            when(users.findByUsername("admin")).thenReturn(Optional.empty());
            when(auditLogs.save(any(AuditLog.class))).thenAnswer(inv -> inv.getArgument(0));

            try (MockedStatic<CurrentUserRoles> mocked = mockStatic(CurrentUserRoles.class)) {
                mocked.when(CurrentUserRoles::username).thenReturn("admin");

                auditLogService.record("USER_CREATED", 1L, Map.of("detail", "test"), request);
            }

            verify(auditLogs).save(any(AuditLog.class));
        }

        @Test
        @DisplayName("Should handle null request gracefully")
        void nullRequest() {
            when(users.findByUsername("admin")).thenReturn(Optional.empty());
            when(auditLogs.save(any(AuditLog.class))).thenAnswer(inv -> inv.getArgument(0));

            try (MockedStatic<CurrentUserRoles> mocked = mockStatic(CurrentUserRoles.class)) {
                mocked.when(CurrentUserRoles::username).thenReturn("admin");

                auditLogService.record("USER_DELETED", 2L, null, null);
            }

            verify(auditLogs).save(any(AuditLog.class));
        }

        @Test
        @DisplayName("Should record IP from request")
        void recordIp() {
            when(request.getRemoteAddr()).thenReturn("192.168.1.100");
            when(users.findByUsername("admin")).thenReturn(Optional.empty());
            when(auditLogs.save(any(AuditLog.class))).thenAnswer(inv -> {
                AuditLog log = inv.getArgument(0);
                assertEquals("192.168.1.100", log.getIpAddress());
                return log;
            });

            try (MockedStatic<CurrentUserRoles> mocked = mockStatic(CurrentUserRoles.class)) {
                mocked.when(CurrentUserRoles::username).thenReturn("admin");

                auditLogService.record("ROLE_CHANGED", 3L, Map.of(), request);
            }
        }
    }

    @Nested
    @DisplayName("list()")
    class ListTests {
        @Test
        @DisplayName("Should list by target user")
        void listByUser() {
            AuditLog log = AuditLog.builder().id(1L).targetUserId(1L).action("CREATED").build();
            when(auditLogs.findByTargetUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(log));

            List<AuditLog> result = auditLogService.list(1L, null);
            assertEquals(1, result.size());
            assertEquals("CREATED", result.get(0).getAction());
        }

        @Test
        @DisplayName("Should list by action filter")
        void listByAction() {
            AuditLog log = AuditLog.builder().id(1L).action("USER_CREATED").build();
            when(auditLogs.findByActionContainingIgnoreCaseOrderByCreatedAtDesc("USER")).thenReturn(List.of(log));

            List<AuditLog> result = auditLogService.list(null, "USER");
            assertEquals(1, result.size());
        }

        @Test
        @DisplayName("Should list recent 200 when no filter")
        void listRecent() {
            when(auditLogs.findTop200ByOrderByCreatedAtDesc()).thenReturn(Collections.emptyList());

            List<AuditLog> result = auditLogService.list(null, null);
            assertTrue(result.isEmpty());
        }
    }
}
