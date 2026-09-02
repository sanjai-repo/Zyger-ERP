package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.Party;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PartyRepository extends JpaRepository<Party, Long> {
    List<Party> findByKind(String kind);
    Optional<Party> findByCode(String code);
    Optional<Party> findByName(String name);
    boolean existsByCode(String code);
}
