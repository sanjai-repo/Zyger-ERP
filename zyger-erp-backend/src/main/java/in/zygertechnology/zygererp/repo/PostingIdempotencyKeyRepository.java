package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.PostingIdempotencyKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PostingIdempotencyKeyRepository extends JpaRepository<PostingIdempotencyKey, String> {
    Optional<PostingIdempotencyKey> findByIdempotencyKey(String idempotencyKey);
}
