package in.zygertechnology.zygererp.repository;

import in.zygertechnology.zygererp.entity.ResourceMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ResourceMasterRepository extends JpaRepository<ResourceMaster, Long> {
    Optional<ResourceMaster> findByResourceCode(String resourceCode);
    List<ResourceMaster> findByActiveTrue();
    List<ResourceMaster> findByResourceTypeAndActiveTrue(String resourceType);
    boolean existsByResourceCode(String resourceCode);
    boolean existsByResourceNameIgnoreCase(String resourceName);
    boolean existsByResourceNameIgnoreCaseAndIdNot(String resourceName, Long id);
}
