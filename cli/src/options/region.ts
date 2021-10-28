import { AwsRegion } from "@cloudcamp/aws-runtime/src/types";
import { Choice } from "../option";

/**
 * Pick AWS region
 */
export class RegionChoice extends Choice<AwsRegion> {
  message = "Region";
  code = "region";

  constructor(region?: string) {
    super();
    this.key = region || AwsRegion.US_EAST_1;
    this.choices = new Map<string, AwsRegion>(
      Object.values(AwsRegion).map((r: AwsRegion) => [r, r])
    );
  }

  displayChoice(key: string): string {
    return key;
  }

  get displayValue(): string {
    return this.displayChoice(this.key as string);
  }
}
