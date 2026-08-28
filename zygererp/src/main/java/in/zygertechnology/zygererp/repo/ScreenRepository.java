package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.Screen;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ScreenRepository extends JpaRepository<Screen, Long> {
    Optional<Screen> findByScreenKey(String screenKey);
    boolean existsByScreenKey(String screenKey);
    List<Screen> findByActiveTrueOrderBySortOrderAsc();
}
