package in.zygertechnology.zygererp.common;

import java.lang.annotation.*;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Idempotent {
    String keyParam() default "idempotencyKey";
    long ttlSeconds() default 86400; // 24 hours default
}
