package in.zygertechnology.zygererp.config;

import in.zygertechnology.zygererp.service.ScreenSeedService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Seeds the data-driven {@code screens} catalogue at startup so the User Control
 * Panel left panel is populated even before any admin opens the screen.
 */
@Component
@RequiredArgsConstructor
public class ScreenSeedRunner implements CommandLineRunner {

    private final ScreenSeedService screenSeedService;

    @Override
    public void run(String... args) {
        // Lazy/non-fatal — the catalogue can also be seeded when the screen is opened.
        screenSeedService.seed();
    }
}
