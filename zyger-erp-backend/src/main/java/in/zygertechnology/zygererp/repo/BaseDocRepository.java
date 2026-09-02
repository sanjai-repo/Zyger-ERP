package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.DocEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.NoRepositoryBean;
import java.util.List;

@NoRepositoryBean
public interface BaseDocRepository<E extends DocEntity> extends JpaRepository<E, Long> {
    List<E> findAllByOrderByDocDateDesc();
    long countByDocNoStartingWith(String prefix);
}