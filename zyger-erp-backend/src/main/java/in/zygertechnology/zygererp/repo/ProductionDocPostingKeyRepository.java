package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.ProductionDocPostingKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductionDocPostingKeyRepository extends JpaRepository<ProductionDocPostingKey, String> {
    Optional<ProductionDocPostingKey> findByIdempotencyKey(String idempotencyKey);
}