"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Save, Trash2, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface AssetDetailHeaderProps {
  title: string;
  type: string;
  parentPoster?: { id: string; title: string } | null;
  isDirty?: boolean;
  isSaving?: boolean;
  onSave?: () => void;
  onDelete?: () => void;
}

export function AssetDetailHeader({
  title,
  type,
  parentPoster,
  isDirty = false,
  isSaving = false,
  onSave,
  onDelete,
}: AssetDetailHeaderProps) {
  const t = useTranslations("assets.posters");

  return (
    <div className="flex items-center justify-between border-b pb-4 mb-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/assets/posters">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>

        <div className="space-y-1">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/assets/posters">
                  {t("title")}
                </BreadcrumbLink>
              </BreadcrumbItem>
              {parentPoster && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href={`/assets/posters/${parentPoster.id}`}>
                      {parentPoster.title}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              )}
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{title}</h1>
            <Badge variant="outline">{type}</Badge>
            {parentPoster && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Film className="h-3 w-3" />
                {t("clipOf", { title: parentPoster.title })}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isDirty && (
          <span className="text-sm text-muted-foreground">
            {t("unsavedChanges")}
          </span>
        )}
        {onSave && (
          <Button onClick={onSave} disabled={!isDirty || isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {t("saveChanges")}
          </Button>
        )}
        {onDelete && (
          <Button variant="destructive" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
