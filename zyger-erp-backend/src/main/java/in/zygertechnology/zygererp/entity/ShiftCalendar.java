package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import in.zygertechnology.zygererp.config.AuditEntityListener;
import java.time.LocalTime;

@Entity @Table(name = "shift_calendar")
@EntityListeners(AuditEntityListener.class)
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ShiftCalendar {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Version Long version;
    @Column(length = 60) String shiftName;
    @Column(name = "start_time") LocalTime startTime;
    @Column(name = "end_time") LocalTime endTime;
    @Column(name = "break_minutes") Integer breakMinutes;
    @Column(name = "working_days", length = 100) String workingDays;
    @Column(name = "overtime_allowed") @Builder.Default Boolean overtimeAllowed = Boolean.FALSE;
    @Builder.Default Boolean active = Boolean.TRUE;
    public boolean isActive() { return Boolean.TRUE.equals(active); }
}
