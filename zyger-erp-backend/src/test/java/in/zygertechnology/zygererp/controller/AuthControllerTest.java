package in.zygertechnology.zygererp.controller;

import in.zygertechnology.zygererp.config.GlobalExceptionHandler;
import in.zygertechnology.zygererp.entity.AppUser;
import in.zygertechnology.zygererp.repo.LoginAuditLogRepository;
import in.zygertechnology.zygererp.repo.RefreshTokenRepository;
import in.zygertechnology.zygererp.repo.UserRepository;
import in.zygertechnology.zygererp.security.JwtService;
import in.zygertechnology.zygererp.service.UserApprovalService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private LoginAuditLogRepository auditLogRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private UserApprovalService userApprovalService;

    @InjectMocks
    private AuthController authController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("Should login successfully with valid credentials")
    void testLoginSuccess() throws Exception {
        AppUser user = new AppUser();
        user.setId(1L);
        user.setUsername("testuser");
        user.setPassword("hashedPassword");
        user.setStatus("ACTIVE");
        user.setActive(true);
        user.setRole("ADMIN");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "hashedPassword")).thenReturn(true);
        when(jwtService.generate(eq("testuser"), eq("ADMIN"))).thenReturn("mock-access-token");

        String jsonPayload = """
                {
                    "username": "testuser",
                    "password": "password123"
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("mock-access-token"))
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @Test
    @DisplayName("Should return 400 Bad Request on invalid credentials")
    void testLoginInvalidCredentials() throws Exception {
        when(userRepository.findByUsername("unknown_user")).thenReturn(Optional.empty());

        String jsonPayload = """
                {
                    "username": "unknown_user",
                    "password": "wrong_password"
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Invalid credentials"));
    }

    @Test
    @DisplayName("Should return 400 Bad Request if account is PENDING approval")
    void testLoginPendingAccount() throws Exception {
        AppUser user = new AppUser();
        user.setUsername("pending_user");
        user.setStatus("PENDING");
        user.setActive(false);

        when(userRepository.findByUsername("pending_user")).thenReturn(Optional.of(user));

        String jsonPayload = """
                {
                    "username": "pending_user",
                    "password": "Password123!"
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Account is awaiting admin approval."));
    }

    @Test
    @DisplayName("Should signup successfully with valid password and email")
    void testSignupSuccess() throws Exception {
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_pass");

        String jsonPayload = """
                {
                    "displayName": "New User",
                    "username": "newuser",
                    "email": "newuser@zyger.in",
                    "password": "Password123!"
                }
                """;

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("newuser"))
                .andExpect(jsonPath("$.message").value("Registration successful. Your account is pending admin approval."));

        verify(userRepository, times(1)).save(any(AppUser.class));
    }
}
