package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name="doc_sequence")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class DocSequence {
    @Id @Column(length = 60) String key;

    int year;
    long next;
    @Version
    Long version;
}
