package in.zygertechnology.zygererp.security;

import java.lang.annotation.*;

@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequirePermission {
    String module() default "";
    String screen() default "";
    String action() default "VIEW";
}
