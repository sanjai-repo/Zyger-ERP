package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.AppUser;
import in.zygertechnology.zygererp.entity.Permission;
import in.zygertechnology.zygererp.entity.Role;
import in.zygertechnology.zygererp.entity.Screen;
import in.zygertechnology.zygererp.entity.UserScreenPermission;
import in.zygertechnology.zygererp.repo.ScreenRepository;
import in.zygertechnology.zygererp.repo.UserRepository;
import in.zygertechnology.zygererp.repo.UserScreenPermissionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RbacServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private ScreenRepository screenRepository;

    @Mock
    private UserScreenPermissionRepository userScreenPermissionRepository;

    @InjectMocks
    private RbacService rbacService;

    private AppUser adminUser;
    private AppUser normalUser;

    @BeforeEach
    void setUp() {
        adminUser = new AppUser();
        adminUser.setId(1L);
        adminUser.setUsername("admin");
        adminUser.setRole("ADMIN");

        Role role = new Role();
        role.setName("SALES_USER");
        role.setActive(true);
        Permission perm = new Permission();
        perm.setModule("SALES");
        perm.setScreen("ORDER");
        perm.setAction("CREATE");
        role.setPermissions(Set.of(perm));

        normalUser = new AppUser();
        normalUser.setId(2L);
        normalUser.setUsername("john");
        normalUser.setRole("USER");
        normalUser.setRoles(Set.of(role));
    }

    @Test
    @DisplayName("Admin user should have permission for everything")
    void testHasPermission_AdminBypass() {
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));

        boolean hasPerm = rbacService.hasPermission("admin", "SALES", "ORDER", "DELETE");

        assertTrue(hasPerm);
    }

    @Test
    @DisplayName("User with role permission should get granted access")
    void testHasPermission_RoleDerived() {
        when(userRepository.findByUsername("john")).thenReturn(Optional.of(normalUser));

        boolean hasPerm = rbacService.hasPermission("john", "SALES", "ORDER", "CREATE");

        assertTrue(hasPerm);
    }

    @Test
    @DisplayName("User without specific permission should get denied access")
    void testHasPermission_Denied() {
        when(userRepository.findByUsername("john")).thenReturn(Optional.of(normalUser));

        boolean hasPerm = rbacService.hasPermission("john", "SALES", "ORDER", "DELETE");

        assertFalse(hasPerm);
    }

    @Test
    @DisplayName("User override screen permissions should expand codes")
    void testGetUserPermissionCodes_ScreenOverrides() {
        when(userRepository.findByUsername("john")).thenReturn(Optional.of(normalUser));

        Screen screen = new Screen();
        screen.setId(10L);
        screen.setModule("QUALITY");
        screen.setActive(true);

        UserScreenPermission override = new UserScreenPermission();
        override.setUserId(2L);
        override.setScreenId(10L);
        override.setCanView(true);
        override.setCanCreate(true);

        when(screenRepository.findAll()).thenReturn(List.of(screen));
        when(userScreenPermissionRepository.findByUserId(2L)).thenReturn(List.of(override));

        Set<String> codes = rbacService.getUserPermissionCodes("john");

        assertTrue(codes.contains("SALES:ORDER:CREATE"));
        assertTrue(codes.contains("QUALITY:*:VIEW"));
        assertTrue(codes.contains("QUALITY:*:CREATE"));
    }

    @Test
    @DisplayName("Wildcards expansion should include module and screen wildcards")
    void testGetUserPermissionsWithWildcards() {
        when(userRepository.findByUsername("john")).thenReturn(Optional.of(normalUser));

        Set<String> expanded = rbacService.getUserPermissionsWithWildcards("john");

        assertTrue(expanded.contains("SALES:ORDER:CREATE"));
        assertTrue(expanded.contains("SALES:*:*"));
        assertTrue(expanded.contains("SALES:ORDER:*"));
    }
}
