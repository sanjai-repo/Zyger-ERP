package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.IdleTimeEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface IdleTimeEntryRepository extends JpaRepository<IdleTimeEntry, Long> {
    List<IdleTimeEntry> findByMachineCode(String machineCode);
    List<IdleTimeEntry> findByWorkOrderNumber(String workOrderNumber);
}
