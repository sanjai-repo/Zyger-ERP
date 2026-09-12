package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.UserScreenPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserScreenPermissionRepository extends JpaRepository<UserScreenPermission, Long> {
    List<UserScreenPermission> findByUserId(Long userId);
    Optional<UserScreenPermission> findByUserIdAndScreenId(Long userId, Long screenId);
    void deleteByUserId(Long userId);
}
