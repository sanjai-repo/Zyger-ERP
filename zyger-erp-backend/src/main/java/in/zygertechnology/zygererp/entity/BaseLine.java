package in.zygertechnology.zygererp.entity;

import in.zygertechnology.zygererp.config.AuditEntityListener;
import jakarta.persistence.*;
import lombok.Getter; import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;

@MappedSuperclass @Getter @Setter
@EntityListeners(AuditEntityListener.class)
public abstract class BaseLine {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    /** Multi-plant scoping. */
    @Column(name = "plant_id")
    Long plantId = 1L;

    @Column(name = "line_no") Integer lineNo;
    @Column(name = "item_code", length = 60) String itemCode;
    @Column(name = "batch_no", length = 60) String batchNo;
    @Column(name = "heat_no", length = 60) String heatNo;
    @Column(name = "lot_no", length = 60) String lotNo;
    @Column(name = "serial_no", length = 60) String serialNo;
    @Column(name = "expiry_date") LocalDate expiryDate;
    @Column(length = 60) String location;
    @Column(length = 60) String warehouse;
    @Column(length = 300) String remarks;
    public abstract BigDecimal getQty();
}
