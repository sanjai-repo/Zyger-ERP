package in.zygertechnology.zygererp.config;

import in.zygertechnology.zygererp.repo.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ProdSafetyCheck {

    private final UserRepository users;
    private final Environment env;

    @EventListener(ApplicationReadyEvent.class)
    public void checkDemoUserInProduction() {
        String[] activeProfiles = env.getActiveProfiles();
        boolean devActive = false;
        for (String profile : activeProfiles) {
            if ("dev".equalsIgnoreCase(profile.trim())) {
                devActive = true;
                break;
            }
        }

        if (!devActive && users.existsByUsername("demo")) {
            log.error("FATAL: Demo user 'demo' exists but active profiles are {}. "
                    + "Refusing to start to prevent production deployment with demo credentials.",
                    String.join(",", activeProfiles));
            throw new IllegalStateException("CRITICAL: Demo user exists in production profile. Refusing to start.");
        }
    }
}
