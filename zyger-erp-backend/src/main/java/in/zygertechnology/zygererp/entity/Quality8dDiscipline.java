package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;
import java.math.BigDecimal;

/**
 * One discipline (D1..D8) of a {@link Quality8d} report.
 */
@Entity
@Table(name = "quality_8d_discipline", indexes = {
        @Index(name = "idx_q8dd_report", columnList = "report_id")
})
@Getter
@Setter
public class Quality8dDiscipline extends BaseLine implements LineEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    Quality8d report;

    /** D1 .. D8 */
    @Column(name = "discipline_code", length = 4)
    String disciplineCode;
    @Column(name = "discipline_name", length = 120)
    String disciplineName;

    @Column(name = "description", length = 1024)
    String description;
    @Column(name = "responsible_person", length = 60)
    String responsiblePerson;
    @Column(name = "due_date")
    LocalDate dueDate;
    @Column(name = "completion_date")
    LocalDate completionDate;
    @Column(name = "evidence", length = 1024)
    String evidence;

    /** PENDING | IN_PROGRESS | COMPLETED | VERIFIED */
    @Column(length = 20)
    String status = "PENDING";
    @Column(name = "verification_result", length = 512)
    String verificationResult;

    @Column(name = "qty")
    BigDecimal qty = BigDecimal.ONE;

    @Override
    public BigDecimal getQty() {
        return qty == null ? BigDecimal.ZERO : qty;
    }
}
