package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.FgPossible;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FgPossibleRepository extends JpaRepository<FgPossible, Long> {
    Optional<FgPossible> findByInquiryNumber(String inquiryNumber);
}
