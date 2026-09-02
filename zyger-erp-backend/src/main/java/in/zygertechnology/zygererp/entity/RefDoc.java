package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name="ref_docs") @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class RefDoc {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(nullable = false, length = 10) String kind;
    @Column(unique = true, nullable = false, length = 60) String number;
    @Column(length = 60) String refCode;
    @Column(length = 20) String status;
}
