package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProdReqMaterialLine;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProdReqMaterialLineRepository extends JpaRepository<ProdReqMaterialLine, Long> {
    List<ProdReqMaterialLine> findByRequestId(Long requestId);
}