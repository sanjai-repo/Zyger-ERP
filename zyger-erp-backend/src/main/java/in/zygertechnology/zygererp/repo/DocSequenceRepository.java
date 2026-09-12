package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.DocSequence;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface DocSequenceRepository extends JpaRepository<DocSequence, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from DocSequence d where d.key = :key and d.year = :year")
    Optional<DocSequence> findByKeyAndYearForUpdate(@Param("key") String key, @Param("year") int year);
}
