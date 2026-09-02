package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PermissionRepository extends JpaRepository<Permission, Long> {
    Optional<Permission> findByModuleAndScreenAndAction(String module, String screen, String action);
    List<Permission> findByModule(String module);
    List<Permission> findByModuleAndScreen(String module, String screen);
    boolean existsByModuleAndScreenAndAction(String module, String screen, String action);
}
