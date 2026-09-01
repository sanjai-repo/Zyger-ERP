package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.AppUser;
import in.zygertechnology.zygererp.repo.RoleRepository;
import in.zygertechnology.zygererp.repo.ScreenRepository;
import in.zygertechnology.zygererp.repo.UserRepository;
import in.zygertechnology.zygererp.repo.UserScreenPermissionRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserApprovalServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private ScreenRepository screenRepository;

    @Mock
    private UserScreenPermissionRepository userPermissionRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private EmailService emailService;

    @Mock
    private ScreenSeedService screenSeedService;

    @Mock
    private HttpServletRequest request;

    @InjectMocks
    private UserApprovalService userApprovalService;

    @Test
    @DisplayName("Should approve pending user and set status ACTIVE")
    void testApproveUser() {
        AppUser user = new AppUser();
        user.setId(10L);
        user.setUsername("john_doe");
        user.setStatus("PENDING");
        user.setRole("OPERATOR");
        user.setEmail("john@zyger.in");

        when(userRepository.findById(10L)).thenReturn(Optional.of(user));

        Map<String, Object> response = userApprovalService.approve(10L, "MANAGER", request);

        assertEquals("ACTIVE", response.get("status"));
        assertEquals("MANAGER", response.get("role"));
        assertEquals("ACTIVE", user.getStatus());
        assertEquals("MANAGER", user.getRole());

        verify(userRepository, times(1)).save(user);
        verify(emailService, times(1)).sendUserStatusNotification(eq("john@zyger.in"), any(), eq("ACTIVE"), any(), eq("MANAGER"));
    }

    @Test
    @DisplayName("Should reject user with reason and set status REJECTED")
    void testRejectUser() {
        AppUser user = new AppUser();
        user.setId(11L);
        user.setUsername("jane_doe");
        user.setStatus("PENDING");
        user.setEmail("jane@zyger.in");

        when(userRepository.findById(11L)).thenReturn(Optional.of(user));

        Map<String, Object> response = userApprovalService.reject(11L, "Invalid credentials", request);

        assertEquals("REJECTED", response.get("status"));
        assertEquals("REJECTED", user.getStatus());
        assertEquals("Invalid credentials", user.getRejectionReason());

        verify(userRepository, times(1)).save(user);
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when rejecting without reason")
    void testRejectUserMissingReason() {
        assertThrows(IllegalArgumentException.class, () -> userApprovalService.reject(11L, "", request));
    }

    @Test
    @DisplayName("Should toggle suspension status")
    void testSetSuspended() {
        AppUser user = new AppUser();
        user.setId(12L);
        user.setUsername("test_user");
        user.setStatus("ACTIVE");

        when(userRepository.findById(12L)).thenReturn(Optional.of(user));

        Map<String, Object> response = userApprovalService.setSuspended(12L, true, request);

        assertEquals("SUSPENDED", response.get("status"));
        assertEquals("SUSPENDED", user.getStatus());
        assertFalse(user.isActive());
    }

    @Test
    @DisplayName("Should correctly calculate status counts excluding hidden admin")
    void testCounts() {
        AppUser u1 = new AppUser();
        u1.setUsername("user1");
        u1.setStatus("ACTIVE");

        AppUser u2 = new AppUser();
        u2.setUsername("user2");
        u2.setStatus("PENDING");

        AppUser admin = new AppUser();
        admin.setUsername("zygeradmin");
        admin.setStatus("ACTIVE");

        when(userRepository.findAll()).thenReturn(List.of(u1, u2, admin));

        UserApprovalService.StatusCounts counts = userApprovalService.counts();

        assertEquals(2, counts.total());
        assertEquals(1, counts.active());
        assertEquals(1, counts.pending());
    }
}
