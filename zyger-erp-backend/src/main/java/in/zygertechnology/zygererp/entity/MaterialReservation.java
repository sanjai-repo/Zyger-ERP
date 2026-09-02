package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "material_reservation")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialReservation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "reservation_number", unique = true, length = 60)
    String reservationNumber;

    @Column(name = "detail_id")
    Long detailId;

    @Column(name = "work_order_id")
    Long workOrderId;

    @Column(name = "item_code", nullable = false, length = 60)
    String itemCode;

    @Column(name = "reserved_qty", nullable = false, precision = 38, scale = 2)
    BigDecimal reservedQty;

    @Column(name = "reserved_date")
    Instant reservedDate;

    @Column(name = "released_date")
    Instant releasedDate;

    @Column(length = 30)
    @Builder.Default String status = "RESERVED";

    @Column(length = 500)
    String remarks;

    String createdBy;
    Instant createdAt;
    String updatedBy;
    Instant updatedAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
