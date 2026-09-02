package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProductConversion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProductConversionRepository extends JpaRepository<ProductConversion, Long> {
    List<ProductConversion> findByStatus(String status);
}
