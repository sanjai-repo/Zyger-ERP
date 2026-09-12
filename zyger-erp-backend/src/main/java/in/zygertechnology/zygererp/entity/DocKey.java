package in.zygertechnology.zygererp.entity;
import java.lang.annotation.*;
@Retention(RetentionPolicy.RUNTIME) @Target(ElementType.TYPE)
public @interface DocKey { String value(); }