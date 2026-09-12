package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProdReqMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProdReqMaterialRepository extends JpaRepository<ProdReqMaterial, Long> {
    Optional<ProdReqMaterial> findByReqNo(String reqNo);
    List<ProdReqMaterial> findByStatus(String status);
    List<ProdReqMaterial> findByJobCardId(Long jobCardId);
    boolean existsByReqNo(String reqNo);
}