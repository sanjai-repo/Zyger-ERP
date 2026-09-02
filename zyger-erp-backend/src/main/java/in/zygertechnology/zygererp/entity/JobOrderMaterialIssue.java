package in.zygertechnology.zygererp.entity;
import jakarta.persistence.*; import lombok.*;
import java.math.BigDecimal;
@Entity @Table(name="job_order_material_issue") @Getter @Setter
public class JobOrderMaterialIssue {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "doc_id") @com.fasterxml.jackson.annotation.JsonIgnore
    JobOrder doc;
    @Column(name = "item_code", length = 60) String itemCode;
    @Column(name = "item_name", length = 200) String itemName;
    @Column(name = "issue_qty") BigDecimal issueQty;
    @Column(length = 30) String uom;
    @Column(name = "batch_lot_number", length = 60) String batchLotNumber;
    @Column(name = "heat_number", length = 60) String heatNumber;
    @Column(name = "dc_number", length = 60) String dcNumber;
    @Column(name = "issue_date") java.time.LocalDate issueDate;
}
