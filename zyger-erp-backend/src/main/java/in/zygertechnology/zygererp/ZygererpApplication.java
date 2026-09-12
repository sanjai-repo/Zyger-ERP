package in.zygertechnology.zygererp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class ZygererpApplication {

	public static void main(String[] args) {
		SpringApplication.run(ZygererpApplication.class, args);
	}

}
