package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.MachineLoadLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MachineLoadLineRepository extends JpaRepository<MachineLoadLine, Long> {
    List<MachineLoadLine> findByLoadPlanId(Long loadPlanId);
    List<MachineLoadLine> findByMachineCode(String machineCode);
    List<MachineLoadLine> findByLoadPlanIdAndMachineCode(Long loadPlanId, String machineCode);
    List<MachineLoadLine> findByWoNumberAndOperationSequence(String woNumber, Integer operationSequence);
}
