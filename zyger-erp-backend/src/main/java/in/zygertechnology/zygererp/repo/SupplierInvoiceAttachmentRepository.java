package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.SupplierInvoiceAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SupplierInvoiceAttachmentRepository extends JpaRepository<SupplierInvoiceAttachment, Long> {
    List<SupplierInvoiceAttachment> findByDocTypeAndDocIdOrderByIdAsc(String docType, Long docId);
    Optional<SupplierInvoiceAttachment> findByIdAndDocTypeAndDocId(Long id, String docType, Long docId);
    long countByDocTypeAndDocId(String docType, Long docId);
}
