package in.zygertechnology.zygererp.entity;
import java.time.Instant;
import java.time.LocalDate; import java.util.List;
public interface DocEntity {
    Long getId(); String getDocNo(); void setDocNo(String s);
    String getStatus(); void setStatus(String s);
    LocalDate getDocDate(); void setDocDate(LocalDate d);
    String getRemarks(); void setRemarks(String r);
    String getCreatedBy(); void setCreatedBy(String c);
    Instant getCreatedAt(); void setCreatedAt(Instant i);
    Instant getUpdatedAt(); void setUpdatedAt(Instant i);
    String getUpdatedBy(); void setUpdatedBy(String u);
    Boolean getDeleted(); void setDeleted(Boolean d);
    Instant getDeletedAt(); void setDeletedAt(Instant i);
    String getDeletedBy(); void setDeletedBy(String u);
    Long getVersion();

    // Lifecycle fields (from BaseDoc)
    default String getSubmittedBy() { return null; }
    default void setSubmittedBy(String s) {}
    default Instant getSubmittedAt() { return null; }
    default void setSubmittedAt(Instant i) {}
    default Long getApprovedByUserId() { return null; }
    default void setApprovedByUserId(Long id) {}
    default Instant getApprovedAt() { return null; }
    default void setApprovedAt(Instant i) {}
    default String getClosedBy() { return null; }
    default void setClosedBy(String s) {}
    default Instant getClosedAt() { return null; }
    default void setClosedAt(Instant i) {}
    default String getCancelledBy() { return null; }
    default void setCancelledBy(String s) {}
    default Instant getCancelledAt() { return null; }
    default void setCancelledAt(Instant i) {}
    default String getReopenedBy() { return null; }
    default void setReopenedBy(String s) {}
    default Instant getReopenedAt() { return null; }
    default void setReopenedAt(Instant i) {}
    default Long getPlantId() { return 1L; }
    default void setPlantId(Long id) {}

    List<? extends LineEntity> getLines();
}