package in.zygertechnology.zygererp.repository;

import in.zygertechnology.zygererp.entity.ApprovalStep;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ApprovalStepRepository extends JpaRepository<ApprovalStep, Long> {
    List<ApprovalStep> findByDocTypeAndDocIdOrderByStepNo(String docType, Long docId);
    List<ApprovalStep> findByDocTypeAndDocIdOrderByStepNoAsc(String docType, Long docId);
    List<ApprovalStep> findByApproverUserIdAndStatus(Long userId, String status);
    List<ApprovalStep> findByDocTypeAndDocId(String docType, Long docId);
    void deleteByDocTypeAndDocId(String docType, Long docId);
}
